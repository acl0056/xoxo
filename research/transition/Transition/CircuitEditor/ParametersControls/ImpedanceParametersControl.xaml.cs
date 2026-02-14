using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
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
    public sealed partial class ImpedanceParametersControl : UserControl
    {
        public Impedance SerializableImpedance { get; }

        private string oldElementName;
        private string oldDescription;

        public ImpedanceParametersControl()
        {
            this.InitializeComponent();
        }

        public ImpedanceParametersControl(Impedance imp)
        {
            this.InitializeComponent();

            SerializableImpedance = imp;

            imp.PropertyChanged += handleChangeOfControls;

            handleChangeOfControls(null, null);
        }
        
        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableImpedance.PropertyChanged -= handleChangeOfControls;

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableImpedance.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            txtDescription.TextChanged -= DescriptionChanged;
            txtDescription.Text = SerializableImpedance.Description;
            txtDescription.TextChanged += DescriptionChanged;

            SerializableImpedance.PropertyChanged += handleChangeOfControls;
        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableImpedance,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }
        
       

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableImpedance.ElementName;
        }

        private void DescriptionChanged(object sender, TextChangedEventArgs e)
        {
            if (oldDescription == txtDescription.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableImpedance,
                Property = "Description",
                OldValue = oldDescription,
                NewValue = txtDescription.Text
            };

            executeCommand(command);

            oldDescription = txtDescription.Text;
        }

        private void DescriptionFocus(object sender, RoutedEventArgs e)
        {
            oldDescription = SerializableImpedance.Description;
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void btnLibraryTap(object sender, TappedRoutedEventArgs e)
        {

        }


        private void checkedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableImpedance,
                Property = "OutputVoltageAcross",
                OldValue = SerializableImpedance.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedVoltageAcross(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableImpedance,
                Property = "OutputVoltageAcross",
                OldValue = SerializableImpedance.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }

        private void checkedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableImpedance,
                Property = "OutputCurrentThrough",
                OldValue = SerializableImpedance.OutputVoltageAcross,
                NewValue = true,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);

        }

        private void uncheckedCurrentThrough(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableImpedance,
                Property = "OutputCurrentThrough",
                OldValue = SerializableImpedance.OutputVoltageAcross,
                NewValue = false,
                CommandType = CommandType.ReBuildAndCalculate
            };

            executeCommand(command);
        }
    }
}
