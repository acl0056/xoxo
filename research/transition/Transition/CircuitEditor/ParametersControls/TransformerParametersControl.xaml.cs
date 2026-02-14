using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Text;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.Components
{
    public sealed partial class TransformerParametersControl : UserControl
    {

        private Transformer SerializableTransformer { get; }
        private string oldElementName;

        public TransformerParametersControl()
        {
            this.InitializeComponent();
        }

        public TransformerParametersControl(Transformer transformer)
        {
            this.InitializeComponent();
            
            SerializableTransformer = transformer;

         //   BoxMutualL.DataContext = transformer;
         //   BoxLpLeak.DataContext = transformer;
         //   BoxLsLeak.DataContext = transformer;
            
            transformer.PropertyChanged += handleChangeOfControls;
            handleChangeOfControls(null, null);
        }

        private void TurnsRatioChange(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransformer,
                Property = "TurnsRatio",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void changeKCouplingCoef(object sender, RangeBaseValueChangedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransformer,
                Property = "KCouplingCoef",
                OldValue = SerializableTransformer.KCouplingCoef,
                NewValue = sldKCouplingCoef.Value
            };

            executeCommand(command);
        }

        private void LPriChange(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransformer,
                Property = "Lpri",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void LSecChange(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransformer,
                Property = "Lsec",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }
        
        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableTransformer.PropertyChanged -= handleChangeOfControls;

            sldKCouplingCoef.ValueChanged -= changeKCouplingCoef;
            sldKCouplingCoef.Value = SerializableTransformer.KCouplingCoef;
            sldKCouplingCoef.ValueChanged += changeKCouplingCoef;
            
            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableTransformer.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            boxTR.Value = SerializableTransformer.TurnsRatio;
            BoxLpri.Value = SerializableTransformer.Lpri;
            BoxLsec.Value = SerializableTransformer.Lsec;

            BoxMutualL.Value = SerializableTransformer.MutualL;
            BoxLpLeak.Value = SerializableTransformer.LpLeak;
            BoxLsLeak.Value = SerializableTransformer.LsLeak;

            SerializableTransformer.PropertyChanged += handleChangeOfControls;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableTransformer,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableTransformer.ElementName;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }
    }
}
