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
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class TransducerParametersControl : UserControl
    {
        private string oldElementName;
        private string oldDescription;

        private Transducer SerializableTransducer;

        public TransducerParametersControl()
        {
            this.InitializeComponent();
        }

        public TransducerParametersControl(Transducer trans)
        {
            this.InitializeComponent();
            SerializableTransducer = trans;

            trans.PropertyChanged += handleChangeOfControls;
            
            handleChangeOfControls(null, null);
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableTransducer.PropertyChanged -= handleChangeOfControls;
            
            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableTransducer.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            txtDescription.TextChanged -= DescriptionChanged;
            txtDescription.Text = SerializableTransducer.Description;
            txtDescription.TextChanged += DescriptionChanged;

            chkPolarity.Checked -= chkPolarityChecked;
            chkPolarity.Unchecked -= chkPolarityUnchecked;
            chkPolarity.IsChecked = SerializableTransducer.PolarityReverse;
            chkPolarity.Checked += chkPolarityChecked;
            chkPolarity.Unchecked += chkPolarityUnchecked;

            boxMicDist.Value = SerializableTransducer.MicDistance;
            boxVoltage.Value = SerializableTransducer.InputVoltage;

            SerializableTransducer.PropertyChanged += handleChangeOfControls;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableTransducer.ElementName;
        }

        private void DescriptionChanged(object sender, TextChangedEventArgs e)
        {
            if (oldDescription == txtDescription.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "Description",
                OldValue = oldDescription,
                NewValue = txtDescription.Text
            };

            executeCommand(command);

            oldDescription = txtDescription.Text;
        }

        private void DescriptionFocus(object sender, RoutedEventArgs e)
        {
            oldDescription = SerializableTransducer.Description;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void boxVoltageChange(object sender, ValueChangedEventArgs args)
        {

        }

        private void boxMicDistChange(object sender, ValueChangedEventArgs args)
        {

        }

        private void chkPolarityUnchecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "PolarityReverse",
                OldValue = SerializableTransducer.PolarityReverse,
                NewValue = false
            };

            executeCommand(command);
        }

        private void chkPolarityChecked(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "PolarityReverse",
                OldValue = SerializableTransducer.PolarityReverse,
                NewValue = true
            };

            executeCommand(command);
        }



        private void checkedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "OutputVoltageAcross",
                OldValue = SerializableTransducer.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "OutputVoltageAcross",
                OldValue = SerializableTransducer.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

        private void checkedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "OutputCurrentThrough",
                OldValue = SerializableTransducer.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableTransducer,
                Property = "OutputCurrentThrough",
                OldValue = SerializableTransducer.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

    }
}
